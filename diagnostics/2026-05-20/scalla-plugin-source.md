# Scalla Plugin Source — 2026-05-20

Plugin dir: `/home/u310848492/domains/ishadama.co.il/public_html/wp-content/plugins/wp-scalla`
Dir exists: true

## scalla.php

```php
<?php
/**
 * Plugin name: scallacrm 
 * Plugin URI: https://scallacrm.co.il
 * Description: Integration of maskyoo and Elementor and CF7 forms
 * Author: scalla
 * Author URI: https://scallacrm.co.il
 * version: 0.1.0
 * License: GPL2 or later.
 * text-domain: query-apis
 */
 
 add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
   
    $raw_fields = $record->get( 'fields' );
    $fields = [];
    foreach ( $raw_fields as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
  
    // Replace HTTP://YOUR_WEBHOOK_URL with the actuall URL you want to post the form to
    wp_remote_post( 'https://api.scallacrm.co.il/modules/Webforms/capture.php?webform_id=00917cf48fd3e13e47d550e0f34a551b',  array(
        'method' => 'POST',
         'headers' => array( 'http-equiv' => 'Content-Type' , 'enctype' => 'multipart/form-data', 'accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9', 'accept-charset' => 'utf-8',  'content' => 'text/html;charset=UTF-8'),
        'body' => $fields , array( 'urlencodeenable' => '1'), 
    )); 
}, 10, 2 );



// style sheet for admin menu.

function load_scalla_admin_menu_css() {

	wp_register_style( 'scalla-for-wp', plugins_url( 'wp-scalla/assets/css/menu.css' ) );

	wp_enqueue_style( 'scalla-for-wp' );

}

// Register style sheet for admin menu.

add_action( 'admin_enqueue_scripts', 'load_scalla_admin_menu_css' );









////////////////// CF7 Sending data to the scalla before sending mail./////////////////////



//load the translation files for any language

//load_plugin_textdomain( "scalla-for-wp", false, "scalla-for-wp/languages" );
/**
 * Load plugin textdomain.
 *
 * @since 1.0.0
 */
function scalla_load_textdomain() {
  load_plugin_textdomain( 'scalla-for-wp', false, basename( dirname( __FILE__ ) ) . '/languages' ); 
}

add_action( 'plugins_loaded', 'scalla_load_textdomain' );




add_action( 'wpcf7_before_send_mail', 'my_scalla_conversion' );



function my_scalla_conversion( $cf7 ) 

{

// start of conversion function

       $url = "https://app.scallacrm.co.il/modules/Webforms/capture.php";
    $fields = array();

    foreach ($_POST as $key=>$value) {

        //All the filtering here

        if (!is_array($value)) {

            if (substr($key, 0, 3) !== "_wp") {$fields[$key] = $value;}

        }

        else {

            foreach ($value as $key2=>$value2) {$valuex .= $value2." , ";}

            $fields[$key] = $valuex;

        }

    }






         if ($fields["scallacampaignid"] == get_option('scallacampid1')) { 
		         $fields["publicid"] = get_option('publicid1'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POST['lp'];
				 $fields["pbcd2"] = $_POST['theurl'];
				 $fields["utm_content"] = $_POST['utm_content'];
				 $fields["scallacampaignid"] = $_POST['scallacampaignid'];
				 }

        if ($fields["scallacampaignid"] == get_option('scallacampid2')) {
			     $fields["publicid"] = get_option('publicid2'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POST['lp'];
				 $fields["pbcd2"] = $_POST['theurl'];
				 $fields["utm_content"] = $_POST['utm_content'];
				 $fields["scallacampaignid"] = $_POST['scallacampaignid'];
				 }

        if ($fields["scallacampaignid"] == get_option('scallacampid3')) {
				 $fields["publicid"] = get_option('publicid3'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POST['lp'];
				 $fields["pbcd2"] = $_POST['theurl'];
				 $fields["utm_content"] = $_POST['utm_content'];
				 $fields["scallacampaignid"] = $_POST['scallacampaignid'];
				 }

        if ($fields["scallacampaignid"] == get_option('scallacampid4')) { 
		         $fields["publicid"] = get_option('publicid4'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POST['lp'];
				 $fields["pbcd2"] = $_POST['theurl'];
				 $fields["utm_content"] = $_POST['utm_content'];
				 $fields["scallacampaignid"] = $_POST['scallacampaignid'];
				 }

        if ($fields["scallacampaignid"] == get_option('scallacampid5')) {
			     $fields["publicid"] = get_option('publicid5'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POST['lp'];
				 $fields["pbcd2"] = $_POST['theurl'];
				 $fields["utm_content"] = $_POST['utm_content'];
				 $fields["scallacampaignid"] = $_POST['scallacampaignid'];
				 }

        if ($fields["scallacampaignid"] == get_option('scallacampid6')) {
			     $fields["publicid"] = get_option('publicid6'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POST['lp'];
				 $fields["pbcd2"] = $_POST['theurl'];
				 $fields["utm_content"] = $_POST['utm_content'];
				 $fields["scallacampaignid"] = $_POST['scallacampaignid'];
				 }

        if ($fields["scallacampaignid"] == get_option('scallacampid7')) {
			     $fields["publicid"] = get_option('publicid7'); 
				 $fields["utm_source"] = $_POST['utm_source'];
				 $fields["utm_campaign"] = $_POST['utm_campaign'];
				 $fields["pbagId"] = $_POST['AgId'];
				 $fields["utm_term"] = $_POST['utm_term'];
				 $fields["pbadpos"] = $_POST['AdPos'];
				 $fields["pbdevice"] = $_POST['device'];
				 $fields["pbgeoloc"] = $_POST['GeoLoc'];
				 $fields["pbcd1"] = $_POST['content_site'];
				 $fields["exone"] = $_POST['exone'];
				 $fields["utm_medium"] = $_POST['utm_medium'];
				 $fields["pblpg"] = $_POS
```

## index.php

```php
<?php // Nothing to see here!
```

## includes/leader-woocommerce.php

```php
<?php////////////////// woocommerce Sending data to leader when order is placed. add_action( 'woocommerce_thankyou', 'wdm_send_order_to_ext' );//my conversion function  $_POST['leader_campaign_id'] = $optionswoo['leaderwoo_text_field_campaignid_1'];$_POST['leader_campaign_password'] = $optionswoo['leaderwoo_text_field_campaignpassword_2'];function wdm_send_order_to_ext( $order_id ){    // get order object and order details    $order = new WC_Order( $order_id );             $leaderWOOoptions = get_option( 'leader_woo_settings' );    $email = $order->billing_email;    $phone = $order->billing_phone;    $shipping_type = $order->get_shipping_method();    $shipping_cost = $order->get_total_shipping();    $orderID = $order->id;    // set the address fields    $user_id = $order->user_id;    $address_fields = array(                'country',        'title',        'first_name',        'last_name',        'company',        'address_1',        'address_2',        'address_3',        'address_4',        'city',        'state',        'postcode'            );    $address = array();    if(is_array($address_fields)){        foreach($address_fields as $field){            $address['billing_'.$field] = get_user_meta( $user_id, 'billing_'.$field, true );            $address['shipping_'.$field] = get_user_meta( $user_id, 'shipping_'.$field, true );        }    }        // get coupon information (if applicable)    $cps = array();    $cps = $order->get_items( 'coupon' );      $coupon = array();    foreach($cps as $cp){        // get coupon titles (and additional details if accepted by the API)        $coupon[] = $cp['name'];    }       // get product details    $items = $order->get_items();    $item_name = array();    $item_qty = array();    $item_price = array();    $item_sku = array();            foreach( $items as $key => $item){        $item_name[] = $item['name'];        $item_qty[] = $item['qty'];        $item_price[] = $item['line_total'];        $item_id = $item['product_id'];        $product = new WC_Product($item_id);        $item_sku[] = $product->get_sku();    }        /* for online payments, send across the transaction ID/key. If the payment is handled offline, you could send across the order key instead */    $transaction_key = get_post_meta( $order_id, '_transaction_id', true );    $transaction_key = empty($transaction_key) ? $_GET['key'] : $transaction_key;       // to test out the API, set $api_mode as ‘sandbox’    $api_mode = 'production';    if($api_mode == 'sandbox'){        // sandbox URL example        $endpoint = "http://sandbox.example.com/";     }else{        // production URL example        $endpoint = "https://www.leader.online/leader/post/";     }/////////////////////////////////////////////////////////////////////////////////////	    // start read leader cookies for woocommerce array    if(!isset($_COOKIE[cc_utm_source])) {            /// we dont have cookie for utm_source - check the jRefferer cookie        	if(!isset($_COOKIE[jRefferer])) {           		 $utm_source_woo = "direct";        	} else {           		 $utm_source_woo = $_COOKIE[jRefferer];        	}            } else {            /// we do have cookie for utm source ($_COOKIE[cc_utm_source])            $utm_source_woo = $_COOKIE[cc_utm_source];            $content_site_woo = $_COOKIE[cc_content_site];            $exone_woo = $_COOKIE[cc_exone];            $utm_medium_woo = $_COOKIE[cc_utm_medium];            $utm_campaign_woo = $_COOKIE[cc_utm_campaign];            $AgId_woo = $_COOKIE[cc_AgId];            $utm_term_woo = $_COOKIE[cc_utm_term];            $AdPos_woo = $_COOKIE[cc_AdPos];            $utm_content_woo = $_COOKIE[cc_utm_content];            $device_woo = $_COOKIE[cc_device];            $GeoLoc_woo = $_COOKIE[cc_GeoLoc];            $lp_woo = $_COOKIE[cc_lp];                $fbclid = $_COOKIE[cc_fbclid];        }            // end read leader cookies/////////////////////////////////////////////////////////////////////////////////////    // setup the data which has to be sent        if(isset($leaderWOOoptions['leaderwoo_radio_field_onof_order_value']) && $leaderWOOoptions['leaderwoo_radio_field_onof_order_value'] === "off"){        $totalOrderValue = (int) $order->total - (int) $order->total_tax;    }else if(isset($leaderWOOoptions['leaderwoo_radio_field_onof_order_value']) && $leaderWOOoptions['leaderwoo_radio_field_onof_order_value'] === "on"){        $totalOrderValue = $order->total;    }else if(!isset($leaderWOOoptions['leaderwoo_radio_field_onof_order_value'])){        $totalOrderValue = (int) $order->total - (int) $order->total_tax;    }     $data = array(        'utm_source' => $utm_source_woo,        'campaignid' => $_POST['leader_campaign_id'],        'campaignpass' => $_POST['leader_campaign_password'],        'Email' => $email,        'Phone' => $phone,       // 'Fname' => $address['billing_first_name'],        'Fname' => $order->billing_first_name." ".$order->billing_last_name,       // 'bill_surname' => $address['billing_last_name'],        //'bill_address1' => $address['billing_address_1'],        //'bill_address2' => $address['billing_address_2'],        //'bill_city' => $address['billing_city'],        //'bill_state' => $address['billing_state'],        //'bill_zip' => $address['billing_postcode'],        //'bill_zip' => $order->billing_postcode,        //'ship_firstname' => $address['shipping_first_name'],        //'ship_surname' => $address['shipping_last_name'],        //'ship_address1' => $address['shipping_address_1'],        //'ship_address2' => $address['shipping_address_2'],        //'ship_city' => $address['shipping_city'],        //'ship_state' => $address['shipping_state'],        //'ship_zip' => $address['shipping_postcode'],        //'shipping_type' => $shipping_type,        ///'shipping_cost' => $shipping_cost,        ///'item_sku' => implode(',', $item_sku),         //'item_price' => implode(',', $item_price),         'OrderPrice' => $totalOrderValue,        'item_name' => implode(',', $item_name),         'Status' => "4",         'content_site' => $content_site_woo,         'exone' => $exone_woo,         'utm_medium' => $utm_medium_woo,         'utm_campaign' => $utm_campaign_woo,         'AgId' => $AgId_woo,         'utm_term' =>  $utm_term_woo,         'AdPos' => $AdPos_woo,         'utm_content' => $utm_content_woo,         'device' => $device_woo,         'GeoLoc' => $GeoLoc_woo,         'lp' =>  $lp_woo,                'fbclid' =>  $fbclid        ///'quantity' => implode(',', $item_qty),         ///'transaction_key' => $transaction_key,        ///'coupon_code' => implode( ",", $coupon )    );            $leadMeta = get_post_meta($orderID, "_lead_created", true);            if($leadMeta === "" && $leadMeta !== "1") {        // send API request via cURL        $ch = curl_init();                /* set the complete URL, to process the order on the external system. Let’s consider http://example.com/buyitem.php is the URL, which invokes the API */        curl_setopt($ch, CURLOPT_URL, $endpoint."post.php");        curl_setopt($ch, CURLOPT_POST, 1);        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);        $response = curl_exec ($ch);        curl_close ($ch);                // the handle response           if (strpos($response,'ERROR') !== false) {            print_r($response);        } else {            // success        }                add_post_meta($orderID, "_lead_created", 1, 1);            }  }//my conversion function end// woocommerce part end?>
```

